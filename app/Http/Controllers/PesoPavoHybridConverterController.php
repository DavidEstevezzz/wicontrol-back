<?php

namespace App\Http\Controllers;

use App\Models\PesoPavoHybridConverter;
use Illuminate\Http\Request;

class PesoPavoHybridConverterController extends Controller
{
    public function index()
    {
        $datos = PesoPavoHybridConverter::orderBy('edad')->paginate(50);
        return view('peso_pavos_hybridconverter.index', compact('datos'));
    }

    public function create()
    {
        return view('peso_pavos_hybridconverter.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'edad'   => 'required|integer|unique:tb_peso_pavos_hybridconverter,edad',
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        PesoPavoHybridConverter::create($data);
        return redirect()->route('pavos-hybridconverter.index')
                         ->with('success','Registro creado correctamente.');
    }

    public function show($edad)
    {
        $item = PesoPavoHybridConverter::findOrFail($edad);
        return view('peso_pavos_hybridconverter.show', compact('item'));
    }

    public function edit($edad)
    {
        $item = PesoPavoHybridConverter::findOrFail($edad);
        return view('peso_pavos_hybridconverter.edit', compact('item'));
    }

    public function update(Request $request, $edad)
    {
        $data = $request->validate([
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        $item = PesoPavoHybridConverter::findOrFail($edad);
        $item->update($data);
        return redirect()->route('pavos-hybridconverter.index')
                         ->with('success','Registro actualizado correctamente.');
    }

    public function destroy($edad)
    {
        $item = PesoPavoHybridConverter::findOrFail($edad);
        $item->delete();
        return redirect()->route('pavos-hybridconverter.index')
                         ->with('success','Registro eliminado correctamente.');
    }
}
