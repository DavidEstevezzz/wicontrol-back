<?php

namespace App\Http\Controllers;

use App\Models\PesoReproductorRoss;
use Illuminate\Http\Request;

class PesoReproductorRossController extends Controller
{
    public function index()
    {
        $datos = PesoReproductorRoss::orderBy('edad')->paginate(50);
        return view('peso_reproductores_ross.index', compact('datos'));
    }

    public function create()
    {
        return view('peso_reproductores_ross.create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'edad'   => 'required|integer|unique:tb_peso_reproductores_ross,edad',
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        PesoReproductorRoss::create($data);
        return redirect()->route('peso-reproductores-ross.index')
                         ->with('success','Registro creado correctamente.');
    }

    public function show($edad)
    {
        $item = PesoReproductorRoss::findOrFail($edad);
        return view('peso_reproductores_ross.show', compact('item'));
    }

    public function edit($edad)
    {
        $item = PesoReproductorRoss::findOrFail($edad);
        return view('peso_reproductores_ross.edit', compact('item'));
    }

    public function update(Request $request, $edad)
    {
        $data = $request->validate([
            'macho'  => 'required|integer',
            'hembra' => 'required|integer',
        ]);
        $item = PesoReproductorRoss::findOrFail($edad);
        $item->update($data);
        return redirect()->route('peso-reproductores-ross.index')
                         ->with('success','Registro actualizado correctamente.');
    }

    public function destroy($edad)
    {
        $item = PesoReproductorRoss::findOrFail($edad);
        $item->delete();
        return redirect()->route('peso-reproductores-ross.index')
                         ->with('success','Registro eliminado correctamente.');
    }
}
