<?php

namespace App\Http\Controllers;

use App\Models\PesoPavoNicholasSelect;
use Illuminate\Http\Request;

class PesoPavoNicholasSelectController extends Controller
{
    public function index()
    {
        $datos = PesoPavoNicholasSelect::orderBy('edad')->paginate(50);
        return view('peso_pavos_nicholasselect.index', compact('datos'));
    }

    public function create()
    {
        return view('peso_pavos_nicholasselect.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'edad'   => 'required|integer|unique:tb_peso_pavos_nicholasselect,edad',
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        PesoPavoNicholasSelect::create($data);
        return redirect()->route('pavos-nicholasselect.index')
                         ->with('success','Registro creado correctamente.');
    }

    public function show($edad)
    {
        $item = PesoPavoNicholasSelect::findOrFail($edad);
        return view('peso_pavos_nicholasselect.show', compact('item'));
    }

    public function edit($edad)
    {
        $item = PesoPavoNicholasSelect::findOrFail($edad);
        return view('peso_pavos_nicholasselect.edit', compact('item'));
    }

    public function update(Request $request, $edad)
    {
        $data = $request->validate([
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        $item = PesoPavoNicholasSelect::findOrFail($edad);
        $item->update($data);
        return redirect()->route('pavos-nicholasselect.index')
                         ->with('success','Registro actualizado correctamente.');
    }

    public function destroy($edad)
    {
        $item = PesoPavoNicholasSelect::findOrFail($edad);
        $item->delete();
        return redirect()->route('pavos-nicholasselect.index')
                         ->with('success','Registro eliminado correctamente.');
    }
}
